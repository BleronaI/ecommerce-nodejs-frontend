import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';
import image from '../../components/Image/Image';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false,
    error: null
  };

  componentDidMount() {
    fetch('http://localhost:8080/feed/posts', {
        headers: {
          Authorization: 'Bearer ' + this.props.token
        }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch posts.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.posts.map(post => ({
            ...post,
            imageUrl: `${post.imageUrl}`
          })),
          totalPosts: resData.totalItems,
          postsLoading: false
        });

        const socket = openSocket('http://localhost:8080'); 
        socket.on('posts', data => {
          if (data.action === 'create') {
            this.addPost(data.post);
          } else if (data.action === 'update') {
            this.updatePosts(data.post)
          } else if (data.action === 'delete'){
            this.loadPosts();
          }
        });
      })
      .catch(this.catchError);
  }


  addPost = post => {
    this.setState(prevState => {
      const postExists = prevState.posts.some(p => p.id === post.id);
      if (postExists) return prevState;

      return {
        posts: [{
          ...post,
          imageUrl: post.imageUrl ? `${post.imageUrl}` : null,
          author: post.user ? post.user.name : 'Unknown'
        }, ...prevState.posts], 
        totalPosts: prevState.totalPosts + 1
      };
    });
  };

  

  updatedPosts = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      const updatedPostIndex = updatedPosts.findIndex(p => p.id === post.id);
      if (updatedPostIndex > -1) {
        updatedPosts[updatedPostIndex] = post;
      }
      return {
        posts: updatedPosts
      };
    });
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    fetch(`http://localhost:8080/feed/posts?page=` + page, {
      headers: {
        Authorization: 'Bearer ' + this.props.token
      }
    })
    .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch posts.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.posts.map(post => ({
            ...post,
            imageUrl: post.imageUrl ? `http://localhost:8080/${post.imageUrl}` : null
          })),
          totalPosts: resData.totalItems,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch('http://localhost:8080/feed/status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: this.state.status
      })
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p.id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({ editLoading: true });
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    if (postData.image) {
      formData.append('image', postData.image);
    } else {
      formData.append('image', this.state.editPost ? this.state.editPost.imageUrl : '');
    }
  
    let url = 'http://localhost:8080/feed/post';
    let method = 'POST';
    if (this.state.editPost) {
      url = `http://localhost:8080/feed/post/${this.state.editPost.id}`;
      method = 'PUT';
    }
  
    fetch(url, {
      method: method,
      body: formData,
      headers: {
        Authorization: 'Bearer ' + this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Creating or editing a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };
  
  
  updatePosts = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      const updatedPostIndex = updatedPosts.findIndex(p => p.id === post.id);
      if (updatedPostIndex > -1) {
        updatedPosts[updatedPostIndex] = post;
      }
      return {
        posts: updatedPosts
      };
    });
  }
  

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    fetch(`http://localhost:8080/feed/post/${postId}`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + this.props.token  
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        this.loadPosts();
        // this.setState(prevState => {
        //   const updatedPosts = prevState.posts.filter(p => p.id !== postId);
        //   return { posts: updatedPosts, postsLoading: false };
        // });
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    let posts = <p style={{ textAlign: 'center' }}>Something went wrong!</p>;
    if (!this.state.error && !this.state.postsLoading) {
      posts = this.state.posts.map(post => (
        <Post
          key={post.id}
          id={post.id}
          author={post.user ? post.user.name : 'Unknown'}
          userId={post.creator ? post.creator.id : null}
          date={new Date(post.createdAt).toLocaleDateString('en-US')}
          title={post.title}
          image={`http://localhost:8080/${post.imageUrl}`}
          content={post.content}
          onStartEdit={this.startEditPostHandler.bind(this, post.id)}
          onDelete={this.deletePostHandler.bind(this, post.id)}
        />
      ));
    }
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading ? <Loader /> : posts}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            />
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
